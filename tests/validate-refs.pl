#!/usr/bin/env perl
use strict;
use warnings;
use File::Basename;
use Cwd 'abs_path';

my $root = dirname(dirname(abs_path($0)));
chdir $root or die "Cannot chdir $root: $!";

my @html = sort glob("*.html");
my @errors;
my @inline;

my @ignored = ('http://', 'https://', '//', 'data:', '#', 'mailto:', 'tel:', 'javascript:');

sub strip_qf {
    my $u = shift;
    $u =~ s/\?.*//;
    $u =~ s/#.*//;
    return $u;
}

sub is_external {
    my $u = shift;
    for my $p (@ignored) {
        return 1 if index($u, $p) == 0;
    }
    return 0;
}

for my $page (@html) {
    open my $fh, '<:encoding(UTF-8)', $page or die $!;
    local $/;
    my $text = <$fh>;
    close $fh;

    if ($text =~ /<script\s+(?![^>]*src=)(?![^>]*type\s*=\s*["']application\/ld\+json["'])[^>]*>/is) {
        push @inline, $page;
    }

    while ($text =~ /src\s*=\s*["']([^"']+)["']/gis) {
        my $src = $1;
        next if is_external($src);
        my $clean = strip_qf($src);
        next unless $clean;
        push @errors, "$page: missing script '$src'" unless -f $clean;
    }

    while ($text =~ /href\s*=\s*["']([^"']+)["']/gis) {
        my $href = $1;
        next if is_external($href);
        my $clean = strip_qf($href);
        next unless $clean;
        if ($clean =~ /\.html$/) {
            push @errors, "$page: missing link '$href'" unless -f $clean;
        } else {
            push @errors, "$page: missing asset '$href'" unless -e $clean;
        }
    }
}

print "Checked ", scalar(@html), " HTML pages.\n";

if (@inline) {
    print "\n⚠️  Pages with inline <script> blocks:\n";
    print "  - $_\n" for @inline;
} else {
    print "\n✅ No inline <script> blocks found.\n";
}

if (@errors) {
    print "\n❌ ", scalar(@errors), " broken reference(s) found:\n";
    print "  - $_\n" for @errors;
    exit 1;
} else {
    print "\n✅ No broken local references found.\n";
    exit 0;
}
